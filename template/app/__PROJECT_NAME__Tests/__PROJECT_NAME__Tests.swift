import Testing
@testable import {{PROJECT_NAME}}

@Suite("StatusViewModel")
struct StatusViewModelTests {
    @Test func checkStatusUpdatesState() async {
        let vm = await StatusViewModel()
        await vm.checkStatus()
        #expect(await vm.isChecking == false)
    }
}
