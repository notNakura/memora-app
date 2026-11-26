import { fireEvent, screen, waitFor } from '@testing-library/react-native';
import { ApiError } from '../../../services/api/client';
import { InviteScreen } from '../InviteScreen';
import { RequestsScreen } from '../RequestsScreen';
import { SectionScreen } from '../SectionScreen';
import { StudentScreen } from '../StudentScreen';
import { TeacherDashboardScreen } from '../TeacherDashboardScreen';
import { fakeClient, header, renderWithSafeArea, summary } from '../__fixtures__/teacherFixtures';

jest.mock('expo-haptics', () => ({ selectionAsync: jest.fn(() => Promise.resolve()) }));

describe('Panel docente (24)', () => {
  const renderDashboard = async (client = fakeClient()) => {
    const handlers = { onOpenSection: jest.fn(), onNewAssessment: jest.fn(), onReviewDecks: jest.fn() };
    await renderWithSafeArea(<TeacherDashboardScreen client={client} teacherName="María Hernández" {...handlers} />);
    return { client, ...handlers };
  };

  it('shows the subject, the teacher, unit mastery averages and the decks waiting for endorsement', async () => {
    const { onReviewDecks, onNewAssessment, onOpenSection } = await renderDashboard();
    expect(await screen.findByText('Sistemas de Información III')).toBeTruthy();
    expect(screen.getByText('Prof. María Hernández')).toBeTruthy();
    expect(screen.getByText('Unidad 1 · Fundamentos')).toBeTruthy();
    expect(screen.getByText('84 %')).toBeTruthy();
    expect(screen.getByText('61 %')).toBeTruthy();
    expect(screen.getByLabelText('Unidad 3 · Normalización: sin datos todavía')).toBeTruthy();
    expect(screen.getByText('3 mazos de estudiantes')).toBeTruthy();
    expect(screen.getByText('Esperan tu aval')).toBeTruthy();
    await fireEvent.press(screen.getByText('REVISAR'));
    expect(onReviewDecks).toHaveBeenCalled();
    await fireEvent.press(screen.getByText('NUEVA EVALUACIÓN'));
    expect(onNewAssessment).toHaveBeenCalled();
    await fireEvent.press(screen.getByText('VER SECCIÓN'));
    expect(onOpenSection).toHaveBeenCalledWith(1);
  });

  it('switches between the teacher’s sections with tabs', async () => {
    const client = fakeClient({
      sections: jest.fn(async () => [summary(), summary({ sectionId: 2, sectionName: 'Sección 2', units: [] })]),
    });
    const { onOpenSection } = await renderDashboard(client);
    await fireEvent.press(await screen.findByText('Sección 2'));
    await fireEvent.press(screen.getByText('VER SECCIÓN'));
    expect(onOpenSection).toHaveBeenCalledWith(2);
  });

  it('shows the empty state when the teacher has no section yet', async () => {
    await renderDashboard(fakeClient({ sections: jest.fn(async () => []) }));
    expect(await screen.findByText('Aún no tienes secciones')).toBeTruthy();
    expect(screen.getByText('Cuando tu institución te asigne una sección, aparecerá aquí.')).toBeTruthy();
  });

  it('shows the server error and retries', async () => {
    const sections = jest
      .fn()
      .mockRejectedValueOnce(new ApiError(0, 'NETWORK', 'No pudimos conectar con Memora.'))
      .mockResolvedValueOnce([summary()]);
    await renderDashboard(fakeClient({ sections }));
    expect(await screen.findByText('No pudimos conectar con Memora.')).toBeTruthy();
    await fireEvent.press(screen.getByText('REINTENTAR'));
    expect(await screen.findByText('Sistemas de Información III')).toBeTruthy();
  });
});

describe('Mi sección (25)', () => {
  const renderSection = async (client = fakeClient()) => {
    const handlers = { onBack: jest.fn(), onInvite: jest.fn(), onRequests: jest.fn(), onStudent: jest.fn(), onUnits: jest.fn() };
    await renderWithSafeArea(<SectionScreen client={client} sectionId={1} {...handlers} />);
    return handlers;
  };

  it('shows the code, the pending requests and the students who need attention first', async () => {
    const { onInvite, onRequests, onStudent } = await renderSection();
    expect(await screen.findByText('SI3 · Sección 1')).toBeTruthy();
    expect(screen.getByText('Lapso 2026-II · 32 inscritos')).toBeTruthy();
    expect(screen.getByText('SK3A26')).toBeTruthy();
    expect(screen.getByText('12 solicitudes por confirmar')).toBeTruthy();
    expect(screen.getByText('Requieren atención (2)')).toBeTruthy();
    expect(screen.getByText('Todos (3)')).toBeTruthy();
    expect(screen.getByText('Debajo del mínimo · 4 días sin repasar')).toBeTruthy();
    expect(screen.getByText('Plan de refuerzo sin completar')).toBeTruthy();
    expect(screen.queryByText('Zoe Alba')).toBeNull();
    await fireEvent.press(screen.getByText('INVITAR'));
    expect(onInvite).toHaveBeenCalled();
    await fireEvent.press(screen.getByLabelText('Revisar las solicitudes por confirmar'));
    expect(onRequests).toHaveBeenCalled();
    await fireEvent.press(screen.getByLabelText(/Carla Rojas/));
    expect(onStudent).toHaveBeenCalledWith(4);
  });

  it('lists everybody in Todos, with a dash for a student without data', async () => {
    await renderSection();
    await fireEvent.press(await screen.findByText('Todos (3)'));
    expect(screen.getByText('Zoe Alba')).toBeTruthy();
    expect(screen.getByText('Al día')).toBeTruthy();
    expect(screen.getByLabelText('Zoe Alba, dominio sin datos todavía, al día')).toBeTruthy();
  });

  it('shows an empty state when nobody is enrolled yet', async () => {
    await renderSection(fakeClient({ section: jest.fn(async () => ({ section: { ...header, activeCount: 0, pendingCount: 0 }, students: [] })) }));
    expect(await screen.findByText('Aún no hay estudiantes inscritos')).toBeTruthy();
  });

  it('answers the 404 of a section of someone else with its message', async () => {
    await renderSection(
      fakeClient({ section: jest.fn().mockRejectedValue(new ApiError(404, 'SECTION_NOT_FOUND', 'No encontramos esta sección.')) }),
    );
    expect(await screen.findByText('No encontramos esta sección.')).toBeTruthy();
  });
});

describe('Invitar a la sección (26)', () => {
  const renderInvite = async (client = fakeClient()) => {
    const handlers = { onBack: jest.fn(), onShare: jest.fn() };
    await renderWithSafeArea(<InviteScreen client={client} sectionId={1} {...handlers} />);
    return { client, ...handlers };
  };

  it('shows the code, the link, the expiry and the QR; shares the link', async () => {
    const { onShare } = await renderInvite();
    expect(await screen.findByText('SK3A26')).toBeTruthy();
    expect(screen.getByText('SI3 · Sección 1 · 32 de 40 cupos')).toBeTruthy();
    expect(screen.getByText('memora.app/u/SK3A26')).toBeTruthy();
    expect(screen.getByText('Vence el 30 sep')).toBeTruthy();
    expect(screen.getByLabelText('Código QR para unirse a SI3 · Sección 1')).toBeTruthy();
    await fireEvent.press(screen.getByText('COMPARTIR ENLACE'));
    expect(onShare).toHaveBeenCalledWith('https://memora.app/u/SK3A26', 'SK3A26');
    await fireEvent.press(screen.getByText('PROYECTAR QR'));
    expect(screen.getByLabelText('Código QR ampliado para proyectar en clase')).toBeTruthy();
  });

  it('changes the join mode', async () => {
    const { client } = await renderInvite();
    await fireEvent.press(await screen.findByText('Con aprobación'));
    await waitFor(() => expect(client.updateJoinSettings).toHaveBeenCalledWith(1, { joinMode: 'approval' }));
    expect(await screen.findByText('Guardamos el modo de ingreso.')).toBeTruthy();
  });

  it('edits capacity and expiry, showing the server field error', async () => {
    const updateJoinSettings = jest
      .fn()
      .mockRejectedValueOnce(
        new ApiError(400, 'VALIDATION', 'Revisa los datos marcados.', {
          capacity: 'El cupo no puede ser menor que los 32 estudiantes inscritos.',
        }),
      )
      .mockResolvedValueOnce({ ...header, capacity: 45, codeExpiresOn: null });
    await renderInvite(fakeClient({ updateJoinSettings }));
    expect(await screen.findByText('40 estudiantes · hasta el 30 sep')).toBeTruthy();
    await fireEvent.press(screen.getByText('EDITAR'));
    await fireEvent.changeText(screen.getByLabelText('Cupo (vacío: sin límite)'), '10');
    await fireEvent.changeText(screen.getByLabelText('Vence el (AAAA-MM-DD, vacío: no vence)'), '');
    await fireEvent.press(screen.getByText('GUARDAR'));
    expect(await screen.findByText('El cupo no puede ser menor que los 32 estudiantes inscritos.')).toBeTruthy();
    expect(updateJoinSettings).toHaveBeenCalledWith(1, { capacity: 10, codeExpiresOn: null });
    await fireEvent.changeText(screen.getByLabelText('Cupo (vacío: sin límite)'), '45');
    await fireEvent.press(screen.getByText('GUARDAR'));
    expect(await screen.findByText('45 estudiantes · sin vencimiento')).toBeTruthy();
  });

  it('generates a new code after a confirmation', async () => {
    const { client } = await renderInvite();
    await fireEvent.press(await screen.findByText('GENERAR CÓDIGO NUEVO'));
    expect(screen.getByText('El código, el enlace y el QR anteriores dejarán de funcionar.')).toBeTruthy();
    expect(client.regenerateCode).not.toHaveBeenCalled();
    await fireEvent.press(screen.getByText('SÍ, GENERAR CÓDIGO NUEVO'));
    expect(await screen.findByText('TQ7W9M')).toBeTruthy();
    expect(client.regenerateCode).toHaveBeenCalledWith(1);
  });

  it('previews a pasted roster CSV with row errors and imports the valid rows', async () => {
    const { client } = await renderInvite();
    await fireEvent.press(await screen.findByText('ACTUALIZAR'));
    await fireEvent.changeText(screen.getByLabelText('Contenido del archivo CSV'), 'cedula,nombres,apellidos,correo\n...');
    await fireEvent.press(screen.getByText('REVISAR ARCHIVO'));
    expect(await screen.findByText('1 fila lista · 1 con error')).toBeTruthy();
    expect(screen.getByText('Fila 3: Falta la cédula.')).toBeTruthy();
    await fireEvent.press(screen.getByText('CARGAR 1 PERSONA'));
    await waitFor(() => expect(client.importRoster).toHaveBeenCalledWith(1, 'cedula,nombres,apellidos,correo\n...'));
    expect(await screen.findByText('Cargamos 1 persona: 1 invitada y 0 ya inscritas.')).toBeTruthy();
  });
});

describe('Solicitudes de ingreso (27)', () => {
  const renderRequests = async (client = fakeClient()) => {
    await renderWithSafeArea(<RequestsScreen client={client} sectionId={1} onBack={jest.fn()} />);
    return client;
  };

  it('explains the counts and marks who is on the list', async () => {
    await renderRequests();
    expect(await screen.findByText('SI3 · Sección 1 · modo Solo inscritos')).toBeTruthy();
    expect(
      screen.getByText(
        'solicitudes: 1 tiene la cédula en la lista pero usó otro correo y 2 no están en la lista. Otros 28 entraron solos al verificar su correo.',
      ),
    ).toBeTruthy();
    expect(screen.getByText('Cédula en la lista')).toBeTruthy();
    expect(screen.getAllByText('No está en la lista')).toHaveLength(2);
    expect(screen.getByText('V-30.118.402 · mariana.ortiz@gmail.com')).toBeTruthy();
  });

  it('approves the ones on the list and rejects the others in bulk', async () => {
    const client = await renderRequests();
    await fireEvent.press(await screen.findByText('APROBAR LOS DE LA LISTA'));
    await waitFor(() => expect(client.decide).toHaveBeenCalledWith(1, 'approve', [21]));
    expect(await screen.findByText('Aprobaste 1 solicitud.')).toBeTruthy();
    await fireEvent.press(screen.getByText('RECHAZAR LOS DEMÁS'));
    await waitFor(() => expect(client.decide).toHaveBeenCalledWith(1, 'reject', [22, 23]));
    expect(await screen.findByText('Rechazaste 2 solicitudes.')).toBeTruthy();
  });

  it('approves or rejects the selected rows', async () => {
    const client = await renderRequests();
    await fireEvent.press(await screen.findByText('Ricardo Luna'));
    await fireEvent.press(screen.getByText('Kevin Duarte'));
    await fireEvent.press(screen.getByText('APROBAR SELECCIONADOS (2)'));
    await waitFor(() => expect(client.decide).toHaveBeenCalledWith(1, 'approve', [22, 23]));
  });

  it('shows the server conflict message', async () => {
    const decide = jest
      .fn()
      .mockRejectedValue(new ApiError(409, 'SECTION_FULL', 'Esta sección ya no tiene cupo.'));
    await renderRequests(fakeClient({ decide }));
    await fireEvent.press(await screen.findByText('APROBAR LOS DE LA LISTA'));
    expect(await screen.findByText('Esta sección ya no tiene cupo.')).toBeTruthy();
  });

  it('shows an empty state without requests', async () => {
    await renderRequests(
      fakeClient({
        requests: jest.fn(async () => ({
          section: header,
          summary: { pending: 0, onRoster: 0, notOnRoster: 0, active: 28 },
          requests: [],
        })),
      }),
    );
    expect(await screen.findByText('No hay solicitudes por confirmar')).toBeTruthy();
  });
});

describe('Desempeño del estudiante (28)', () => {
  const renderStudent = async (client = fakeClient()) => {
    await renderWithSafeArea(<StudentScreen client={client} sectionId={1} studentId={4} onBack={jest.fn()} />);
    return client;
  };

  it('shows mastery per unit, last review, plan, streak, assessments and most failed cards', async () => {
    await renderStudent();
    expect(await screen.findByText('Carla Rojas')).toBeTruthy();
    expect(screen.getByText('C.I. V-20.000.002 · tiempo extendido activo')).toBeTruthy();
    expect(screen.getByText('Dominio general')).toBeTruthy();
    expect(screen.getByText('62 %')).toBeTruthy();
    expect(screen.getByText('Unidad 1 · Fundamentos')).toBeTruthy();
    expect(screen.getByText('48 %')).toBeTruthy();
    expect(screen.getByText('Desbloqueada')).toBeTruthy();
    expect(screen.getByText('Hace 4 días')).toBeTruthy();
    expect(screen.getByText('Día 1 de 3')).toBeTruthy();
    expect(screen.getByText('0 días (mejor: 9)')).toBeTruthy();
    expect(screen.getByText('Intento 1 · 50 % de dominio')).toBeTruthy();
    expect(screen.getByText('10')).toBeTruthy();
    expect(screen.getByText('¿Qué indica la cardinalidad 1:N?')).toBeTruthy();
    expect(screen.getByText('5 fallos')).toBeTruthy();
    expect(screen.getByLabelText('Actividad de los últimos 7 días: 3 repasos')).toBeTruthy();
  });

  it('shows no percentages for a student who never reviewed (CU-23 2a)', async () => {
    await renderStudent(
      fakeClient({
        student: jest.fn(async () => ({
          student: { studentId: 4, name: 'Zoe Alba', nationalId: null, extendedTime: false },
          overall: null,
          units: [{ unitId: 1, number: 1, name: 'Fundamentos', mastery: null, unlocked: false }],
          lastReviewAt: null,
          daysSinceReview: null,
          activity: [],
          assessments: [],
          hardestCards: [],
          streak: null,
          plan: null,
        })),
      }),
    );
    expect(await screen.findByText('Aún no ha repasado')).toBeTruthy();
    expect(screen.queryByText(/%/)).toBeNull();
    expect(screen.getByText('Aún no presenta evaluaciones.')).toBeTruthy();
    expect(screen.getByText('Aún no hay tarjetas falladas.')).toBeTruthy();
  });

  it('unlocks a unit with a justification (RF-46)', async () => {
    const client = await renderStudent();
    await fireEvent.press(await screen.findByText('DESBLOQUEAR UNIDAD'));
    await fireEvent.press(screen.getByText('Unidad 2'));
    await fireEvent.press(screen.getByText('CONFIRMAR DESBLOQUEO'));
    expect(await screen.findByText('Escribe la justificación.')).toBeTruthy();
    await fireEvent.changeText(screen.getByLabelText('Justificación'), 'Reposo médico');
    await fireEvent.press(screen.getByText('CONFIRMAR DESBLOQUEO'));
    await waitFor(() => expect(client.unlockUnit).toHaveBeenCalledWith(1, 4, 2, 'Reposo médico'));
    expect(await screen.findByText('Desbloqueaste la Unidad 2.')).toBeTruthy();
  });

  it('tells that extra time comes with the assessments', async () => {
    await renderStudent();
    await fireEvent.press(await screen.findByText('DAR TIEMPO EXTRA'));
    expect(screen.getByText('Dar tiempo extra estará disponible pronto, con las evaluaciones.')).toBeTruthy();
  });

});
